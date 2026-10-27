package com.darklordempeor.jobsdb.application.usecase.jobseeker;

import com.darklordempeor.jobsdb.application.port.ResumePort;
import com.darklordempeor.jobsdb.domain.exception.DomainException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ResumeUseCaseTest {
    @Test void validatesBeforePersistenceAndDelegatesExplicitActorScope() {
        var port=mock(ResumePort.class); var useCase=new ResumeUseCase(port);
        UUID owner=UUID.randomUUID(),id=UUID.randomUUID();
        assertThatThrownBy(() -> useCase.upload(owner,"bad.pdf","application/pdf",new byte[0])).isInstanceOf(DomainException.class);
        verifyNoInteractions(port);
        byte[] bytes="%PDF-1.7\n%%EOF".getBytes(StandardCharsets.US_ASCII);
        useCase.upload(owner,"../cv.pdf","application/pdf",bytes); verify(port).create(owner,"cv.pdf",bytes);
        useCase.list(owner); verify(port).list(owner);
        useCase.select(owner,id); verify(port).select(owner,id);
        useCase.clear(owner); verify(port).clear(owner);
        useCase.delete(owner,id); verify(port).delete(owner,id);
        useCase.download(owner,id); verify(port).download(owner,id);
        useCase.applicationDownload(owner,id,true); verify(port).applicationDownload(owner,id,true);
    }
}
